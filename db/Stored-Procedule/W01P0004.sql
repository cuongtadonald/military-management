IF EXISTS (SELECT TOP 1 1 FROM DBO.SYSOBJECTS WITH(NOLOCK) WHERE ID = OBJECT_ID(N'[DBO].[W01P0004]') AND OBJECTPROPERTY(ID, N'IsProcedure') = 1)
DROP PROCEDURE [DBO].[W01P0004]
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_NULLS ON
GO

-- <Summary>
---- Hien thi danh sách user cấp con để quản lý
-- <Param>s
---- 
-- <Return>
---- 
-- <Reference>	
---- 
-- <History>
---- Create on 11/07/2026 by NgocDuy  Hien thi danh sách user cấp con để quản lý
---EXEC W01P0004 @UserID = 'U001'; --câu test store


CREATE PROCEDURE W01P0004
( 
  @UserID VARCHAR(50)

) AS

DECLARE @RoleID VARCHAR(50)
DECLARE @UnitID VARCHAR(50)
DECLARE @HierarchyPath VARCHAR(1000)

SELECT
    @UnitID = UnitID
FROM [User] WITH(NOLOCK)
WHERE UserID = @UserID

IF @UnitID IS NULL
    RETURN

SELECT @HierarchyPath = HierarchyPath
FROM OrganizationUnit WITH(NOLOCK)
WHERE UnitID = @UnitID

SELECT 
U.UserID,
U.Username,
U.FullName,
R.RoleName,
U.UnitID,
PermissionLevel
FROM [User] U
LEFT JOIN Role R WITH(NOLOCK) ON U.RoleID = R.RoleID
LEFT JOIN OrganizationUnit ou WITH(NOLOCK)
ON U.UnitID = ou.UnitID
WHERE ou.HierarchyPath LIKE @HierarchyPath + '%'
AND ou.UnitID <> @UnitID


GO
SET QUOTED_IDENTIFIER OFF
GO
SET ANSI_NULLS ON
GO

