IF EXISTS (SELECT TOP 1 1 FROM DBO.SYSOBJECTS WITH(NOLOCK) WHERE ID = OBJECT_ID(N'[DBO].[W01P0001]') AND OBJECTPROPERTY(ID, N'IsProcedure') = 1)
DROP PROCEDURE [DBO].[W01P0001]
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_NULLS ON
GO

-- <Summary>
---- Hien thi trang chinh
-- <Param>s
---- 
-- <Return>
---- 
-- <Reference>	
---- 
-- <History>
---- Create on 19/06/2026 by NgocDuy  Hien Thi trang chinh
---EXEC W01P0001 @UserID = 'U003', @Mode = 0; --câu test store


CREATE PROCEDURE W01P0001
( 
  @UserID VARCHAR(50),
  @Mode   VARCHAR(50)

) AS

DECLARE @RoleID VARCHAR(50)
DECLARE @UnitID VARCHAR(50)
DECLARE @HierarchyPath VARCHAR(1000)

SELECT
    @RoleID = RoleID,
    @UnitID = UnitID
FROM [User] WITH(NOLOCK)
WHERE UserID = @UserID

IF @UnitID IS NULL
    RETURN

SELECT @HierarchyPath = HierarchyPath
FROM OrganizationUnit WITH(NOLOCK)
WHERE UnitID = @UnitID

IF @RoleID = 'ADMIN'
BEGIN
    SET @HierarchyPath = ''
END

IF (@Mode = 0)
BEGIN 
    SELECT
        s.SoldierID,
        s.FullName,
        s.DateOfBirth,
        s.Gender,
        s.CitizenID,
		ou.UnitID,
        ou.UnitName,
		ou.FullPathName,
		ou.UnitShortName,
        s.Position,
        r.RankName,
        st.Description AS StatusName,

        s.Ethnicity,
        s.Religion,
        ms.MaritalStatusName,

        s.EducationLevel,
        s.Specialization,
        s.PoliticalLevel,

        s.BloodType,
        s.HealthClassification,

        s.Height,
        s.Weight,
        s.BloodPressure,

         s.Hometown,

        s.Address,
        w.WardName AS CurrentWard,
        p.ProvinceName AS CurrentProvince,

        s.EnlistmentDate,
        s.PartyJoinDate,
        s.YouthUnionJoinDate,

        s.PhotoPath,
        s.FileID,

        s.CreatedDate,
        s.CreatedBy,
        s.LastModifiedDate,
        s.LastModifiedBy,
		st.Description
    FROM Soldier s WITH(NOLOCK)
    LEFT JOIN OrganizationUnit ou WITH(NOLOCK)
        ON s.UnitID = ou.UnitID
    LEFT JOIN Rank r WITH(NOLOCK)
        ON s.RankID = r.RankID
    LEFT JOIN Status st WITH(NOLOCK)
        ON s.StatusID = st.StatusID
    LEFT JOIN MaritalStatus ms WITH(NOLOCK)
        ON s.MaritalStatusID = ms.MaritalStatusID
  
    LEFT JOIN Ward w WITH(NOLOCK)
        ON s.WardID = w.WardID
    LEFT JOIN Province p WITH(NOLOCK)
        ON s.ProvinceID = p.ProvinceID
	WHERE
        @RoleID = 'ADMIN'
        OR @RoleID = 'sd5_admin'
        OR ou.HierarchyPath LIKE @HierarchyPath + '%'
		AND s.StatusID NOT LIKE 'ST004'
END
ELSE
IF (@Mode = 1)
BEGIN 
    SELECT
        s.SoldierID,
        s.FullName,
        s.DateOfBirth,
        s.Gender,
        s.CitizenID,
		ou.UnitID,
        ou.UnitName,
		ou.FullPathName,
		ou.UnitShortName,
        s.Position,
        r.RankName,
        st.Description AS StatusName,

        s.Ethnicity,
        s.Religion,
        ms.MaritalStatusName,

        s.EducationLevel,
        s.Specialization,
        s.PoliticalLevel,

        s.BloodType,
        s.HealthClassification,

        s.Height,
        s.Weight,
        s.BloodPressure,

         s.Hometown,

        s.Address,
        w.WardName AS CurrentWard,
        p.ProvinceName AS CurrentProvince,

        s.EnlistmentDate,
        s.PartyJoinDate,
        s.YouthUnionJoinDate,

        s.PhotoPath,
        s.FileID,

        s.CreatedDate,
        s.CreatedBy,
        s.LastModifiedDate,
        s.LastModifiedBy,
		st.Description
    FROM Soldier s WITH(NOLOCK)
    LEFT JOIN OrganizationUnit ou WITH(NOLOCK)
        ON s.UnitID = ou.UnitID
    LEFT JOIN Rank r WITH(NOLOCK)
        ON s.RankID = r.RankID
    LEFT JOIN Status st WITH(NOLOCK)
        ON s.StatusID = st.StatusID
    LEFT JOIN MaritalStatus ms WITH(NOLOCK)
        ON s.MaritalStatusID = ms.MaritalStatusID
  
    LEFT JOIN Ward w WITH(NOLOCK)
        ON s.WardID = w.WardID
    LEFT JOIN Province p WITH(NOLOCK)
        ON s.ProvinceID = p.ProvinceID
    WHERE
        @RoleID = 'ADMIN'
        OR @RoleID = 'sd5_admin'
        OR ou.HierarchyPath LIKE @HierarchyPath + '%'
        AND s.StatusID = 'ST004'
END


GO
SET QUOTED_IDENTIFIER OFF
GO
SET ANSI_NULLS ON
GO

