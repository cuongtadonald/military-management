IF EXISTS (SELECT TOP 1 1 FROM DBO.SYSOBJECTS WITH(NOLOCK) WHERE ID = OBJECT_ID(N'[DBO].[W01P0005]') AND OBJECTPROPERTY(ID, N'IsProcedure') = 1)
DROP PROCEDURE [DBO].[W01P0005]
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_NULLS ON
GO

-- <Summary>
---- Hien thi danh sách thông báo 
-- <Param>s
---- 
-- <Return>
---- 
-- <Reference>	
---- 
-- <ChangeHistory>
---- Create on 11/07/2026 by NgocDuy  Hien thi danh sách thông báo
---EXEC W01P0005 @UserID = 'U002', @Mode = 0; --câu test store


CREATE PROCEDURE W01P0005
(
    @UserID VARCHAR(50),
    @Mode TINYINT -- 0: ChangeHistory, 1: PermissionRequest
)
AS
BEGIN

    SET NOCOUNT ON;

    DECLARE @UnitID VARCHAR(50)
    DECLARE @HierarchyPath VARCHAR(1000)

    SELECT @UnitID = UnitID
    FROM [User] WITH(NOLOCK)
    WHERE UserID = @UserID

    IF @UnitID IS NULL
        RETURN

    SELECT @HierarchyPath = HierarchyPath
    FROM OrganizationUnit WITH(NOLOCK)
    WHERE UnitID = @UnitID

    /* TAB LỊCH SỬ THAY ĐỔI */

    IF @Mode = 0
    BEGIN

        SELECT
            CH.ChangeHistoryID AS ID,
            CH.ChangeDate,
            CH.ChangeType,
            CH.TotalSoldier,
            CH.ChangeReason,
            U.FullName AS ChangedByName,
            OU.UnitName,
            CH.Description
        FROM ChangeHistory CH WITH(NOLOCK)
        INNER JOIN [User] U WITH(NOLOCK)
            ON CH.ChangedBy = U.UserID
        INNER JOIN OrganizationUnit OU WITH(NOLOCK)
            ON U.UnitID = OU.UnitID
        WHERE OU.HierarchyPath LIKE @HierarchyPath + '%'
        ORDER BY CH.ChangeDate DESC

    END

    /* TAB YÊU CẦU CẤP QUYỀN */
	IF @Mode = 1
    BEGIN
	   SELECT
		PR.RequestID AS ID,
		PR.Title,
		PR.StatusID,
		ST.StatusName,
		ST.Description AS StatusDescription,
		PR.RequestDate,
		PR.ApprovedDate,
		PR.ExpiredDate,
		U.FullName AS RequestByName,
		OU.UnitName,
		PR.Description
		FROM PermissionRequest PR WITH(NOLOCK)
		INNER JOIN [User] U WITH(NOLOCK)
			ON PR.RequestBy = U.UserID
		INNER JOIN OrganizationUnit OU WITH(NOLOCK)
			ON U.UnitID = OU.UnitID
		LEFT JOIN Status ST WITH(NOLOCK)
			ON PR.StatusID = ST.StatusID
		WHERE OU.HierarchyPath LIKE @HierarchyPath + '%'
		ORDER BY PR.RequestDate DESC
	END
END
GO

GO
SET QUOTED_IDENTIFIER OFF
GO
SET ANSI_NULLS ON
GO

